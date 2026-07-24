import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { AuthPromptProvider } from './context/AuthPromptContext'
import { SellSheetProvider } from './context/SellSheetContext'
import { CreateListingPage } from './pages/CreateListingPage'
import { EditListingPage } from './pages/EditListingPage'
import { HomePage } from './pages/HomePage'
import { ListingDetailPage } from './pages/ListingDetailPage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { SearchResultsPage } from './pages/SearchResultsPage'
import { SignupPage } from './pages/SignupPage'
import { ThreadPage } from './pages/ThreadPage'
import { ThreadsPage } from './pages/ThreadsPage'
import { VerifyOtpPage } from './pages/VerifyOtpPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthPromptProvider>
          <SellSheetProvider>
            <AppShell>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/verify" element={<VerifyOtpPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/listings/:id" element={<ListingDetailPage />} />
                <Route path="/search" element={<SearchResultsPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/listings/new" element={<CreateListingPage />} />
                  <Route path="/listings/:id/edit" element={<EditListingPage />} />
                  <Route path="/my-listings" element={<Navigate to="/profile?tab=selling" replace />} />
                  <Route path="/messages" element={<ThreadsPage />} />
                  <Route path="/listings/:id/chat" element={<ThreadPage />} />
                </Route>
              </Routes>
            </AppShell>
          </SellSheetProvider>
        </AuthPromptProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
