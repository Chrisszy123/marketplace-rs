use std::{collections::HashMap, sync::Arc};

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;

use crate::{auth::jwt, AppState};

/// Per-user list of live WS senders (a user can have multiple tabs/devices open at once).
/// In-memory and single-instance: fine at this project's scale, but horizontally scaling the
/// backend would need this to move to Redis pub/sub instead.
pub type Registry = Arc<RwLock<HashMap<Uuid, Vec<mpsc::UnboundedSender<String>>>>>;

pub fn new_registry() -> Registry {
    Arc::new(RwLock::new(HashMap::new()))
}

pub async fn push_to_user(registry: &Registry, user_id: Uuid, payload: &str) {
    let map = registry.read().await;
    if let Some(senders) = map.get(&user_id) {
        for sender in senders {
            let _ = sender.send(payload.to_string());
        }
    }
}

#[derive(Deserialize)]
pub struct WsAuthQuery {
    token: String,
}

/// Browsers can't set an Authorization header on a WebSocket handshake, so the short-lived
/// access token travels as a query param instead. Same trust level as the header-based auth
/// used everywhere else, just a different transport.
pub async fn upgrade(
    State(state): State<AppState>,
    Query(query): Query<WsAuthQuery>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    let claims = match jwt::verify_access_token(&query.token, &state.jwt_access_secret) {
        Ok(claims) => claims,
        Err(_) => return (StatusCode::UNAUTHORIZED, "invalid or expired token").into_response(),
    };

    ws.on_upgrade(move |socket| handle_socket(socket, state, claims.sub))
}

async fn handle_socket(mut socket: WebSocket, state: AppState, user_id: Uuid) {
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    state
        .ws_registry
        .write()
        .await
        .entry(user_id)
        .or_default()
        .push(tx.clone());

    loop {
        tokio::select! {
            outgoing = rx.recv() => {
                match outgoing {
                    Some(payload) => {
                        if socket.send(Message::Text(payload.into())).await.is_err() {
                            break;
                        }
                    }
                    None => break,
                }
            }
            incoming = socket.recv() => {
                match incoming {
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Ok(_)) => {}, // client->server payloads are unused; sending goes over POST
                    Some(Err(_)) => break,
                }
            }
        }
    }

    if let Some(senders) = state.ws_registry.write().await.get_mut(&user_id) {
        senders.retain(|s| !s.same_channel(&tx));
    }
}
