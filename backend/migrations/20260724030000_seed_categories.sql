INSERT INTO categories (name, slug) VALUES
    ('Vehicles', 'vehicles'),
    ('Property', 'property'),
    ('Electronics', 'electronics'),
    ('Fashion & Beauty', 'fashion-beauty'),
    ('Home & Furniture', 'home-furniture'),
    ('Jobs', 'jobs'),
    ('Services', 'services'),
    ('Agriculture', 'agriculture'),
    ('Baby & Kids', 'baby-kids'),
    ('Others', 'others');

INSERT INTO categories (parent_id, name, slug)
SELECT categories.id, sub.name, sub.slug FROM categories, (VALUES
    ('Cars', 'vehicles-cars'),
    ('Motorcycles', 'vehicles-motorcycles'),
    ('Trucks & Trailers', 'vehicles-trucks-trailers'),
    ('Buses & Microbuses', 'vehicles-buses-microbuses'),
    ('Vehicle Parts & Accessories', 'vehicles-parts-accessories'),
    ('Boats & Watercraft', 'vehicles-boats-watercraft')
) AS sub (name, slug)
WHERE categories.slug = 'vehicles';

INSERT INTO categories (parent_id, name, slug)
SELECT categories.id, sub.name, sub.slug FROM categories, (VALUES
    ('Houses & Apartments for Rent', 'property-rent'),
    ('Houses & Apartments for Sale', 'property-sale'),
    ('Land & Plots', 'property-land'),
    ('Commercial Property', 'property-commercial'),
    ('Short-let Accommodation', 'property-short-let')
) AS sub (name, slug)
WHERE categories.slug = 'property';

INSERT INTO categories (parent_id, name, slug)
SELECT categories.id, sub.name, sub.slug FROM categories, (VALUES
    ('Mobile Phones', 'electronics-mobile-phones'),
    ('Computers & Laptops', 'electronics-computers-laptops'),
    ('TVs & Home Theatre', 'electronics-tvs-home-theatre'),
    ('Cameras & Accessories', 'electronics-cameras-accessories'),
    ('Video Games & Consoles', 'electronics-video-games-consoles'),
    ('Home Appliances', 'electronics-home-appliances')
) AS sub (name, slug)
WHERE categories.slug = 'electronics';

INSERT INTO categories (parent_id, name, slug)
SELECT categories.id, sub.name, sub.slug FROM categories, (VALUES
    ('Clothing', 'fashion-clothing'),
    ('Shoes', 'fashion-shoes'),
    ('Bags & Accessories', 'fashion-bags-accessories'),
    ('Jewelry & Watches', 'fashion-jewelry-watches'),
    ('Health & Beauty', 'fashion-health-beauty')
) AS sub (name, slug)
WHERE categories.slug = 'fashion-beauty';

INSERT INTO categories (parent_id, name, slug)
SELECT categories.id, sub.name, sub.slug FROM categories, (VALUES
    ('Furniture', 'home-furniture-furniture'),
    ('Home Decor', 'home-furniture-decor'),
    ('Kitchen & Dining', 'home-furniture-kitchen-dining'),
    ('Garden & Outdoor', 'home-furniture-garden-outdoor')
) AS sub (name, slug)
WHERE categories.slug = 'home-furniture';

INSERT INTO categories (parent_id, name, slug)
SELECT categories.id, sub.name, sub.slug FROM categories, (VALUES
    ('Sales & Marketing Jobs', 'jobs-sales-marketing'),
    ('IT & Software Jobs', 'jobs-it-software'),
    ('Admin & Office Jobs', 'jobs-admin-office'),
    ('Skilled Trades Jobs', 'jobs-skilled-trades'),
    ('Internships', 'jobs-internships')
) AS sub (name, slug)
WHERE categories.slug = 'jobs';

INSERT INTO categories (parent_id, name, slug)
SELECT categories.id, sub.name, sub.slug FROM categories, (VALUES
    ('Repair Services', 'services-repair'),
    ('Automotive Services', 'services-automotive'),
    ('Event Services', 'services-events'),
    ('Education & Tutoring', 'services-education-tutoring'),
    ('Health & Fitness Services', 'services-health-fitness'),
    ('Cleaning Services', 'services-cleaning')
) AS sub (name, slug)
WHERE categories.slug = 'services';

INSERT INTO categories (parent_id, name, slug)
SELECT categories.id, sub.name, sub.slug FROM categories, (VALUES
    ('Livestock & Poultry', 'agriculture-livestock-poultry'),
    ('Farm Machinery & Equipment', 'agriculture-machinery-equipment'),
    ('Seeds & Seedlings', 'agriculture-seeds-seedlings'),
    ('Agro Processing Equipment', 'agriculture-processing-equipment')
) AS sub (name, slug)
WHERE categories.slug = 'agriculture';

INSERT INTO categories (parent_id, name, slug)
SELECT categories.id, sub.name, sub.slug FROM categories, (VALUES
    ('Baby Clothing', 'baby-kids-clothing'),
    ('Toys', 'baby-kids-toys'),
    ('Strollers & Car Seats', 'baby-kids-strollers-car-seats'),
    ('Kids Furniture', 'baby-kids-furniture')
) AS sub (name, slug)
WHERE categories.slug = 'baby-kids';

INSERT INTO categories (parent_id, name, slug)
SELECT categories.id, sub.name, sub.slug FROM categories, (VALUES
    ('Books & Games', 'others-books-games'),
    ('Musical Instruments', 'others-musical-instruments'),
    ('Sports Equipment', 'others-sports-equipment'),
    ('Miscellaneous', 'others-miscellaneous')
) AS sub (name, slug)
WHERE categories.slug = 'others';
