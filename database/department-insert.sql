-- Generate a bcrypt hash with:
-- cd server && node utils/generateHash.js "ChangeMe123!"
-- Replace the placeholder hashes below with the generated values.

INSERT INTO departments (name, code, email, password_hash, phone, description)
VALUES
('Roads & Infrastructure', 'ROADS', 'roads@civicfix.local', '$2a$12$uH.vH7tau9snZi1hxrYy1ORHxI8CDJ7sh9Efo2LL2GDckeyK1rlSO', '9000000001', 'Road and public infrastructure'),
('Electrical / Street Lighting', 'ELECTRICAL', 'electrical@civicfix.local', '$2a$12$uH.vH7tau9snZi1hxrYy1ORHxI8CDJ7sh9Efo2LL2GDckeyK1rlSO', '9000000002', 'Street lighting and electrical civic assets'),
('Sanitation', 'SANITATION', 'sanitation@civicfix.local', '$2a$12$uH.vH7tau9snZi1hxrYy1ORHxI8CDJ7sh9Efo2LL2GDckeyK1rlSO', '9000000003', 'Waste and sanitation'),
('Water Supply', 'WATER', 'water@civicfix.local', '$2a$12$uH.vH7tau9snZi1hxrYy1ORHxI8CDJ7sh9Efo2LL2GDckeyK1rlSO', '9000000004', 'Water supply and leakage'),
('Parks & Tree Management', 'PARKS', 'parks@civicfix.local', '$2a$12$uH.vH7tau9snZi1hxrYy1ORHxI8CDJ7sh9Efo2LL2GDckeyK1rlSO', '9000000005', 'Parks and tree management'),
('Public Works', 'PUBLIC_WORKS', 'publicworks@civicfix.local', '$2a$12$uH.vH7tau9snZi1hxrYy1ORHxI8CDJ7sh9Efo2LL2GDckeyK1rlSO', '9000000006', 'Public works'),
('Municipal Administration', 'MUNICIPAL', 'admin@civicfix.local', '$2a$12$uH.vH7tau9snZi1hxrYy1ORHxI8CDJ7sh9Efo2LL2GDckeyK1rlSO', '9000000007', 'Municipal administration')
ON CONFLICT (code) DO NOTHING;
