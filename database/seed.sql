-- Development seed. Requires departments from department-insert.sql.
-- Demo citizen hash is bcrypt for ChangeMe123!; replace if deploying elsewhere.
INSERT INTO users (role, name, email, phone, password_hash)
VALUES ('CITIZEN','Demo Citizen','citizen@example.com','9000000010',
'$2b$12$LQv3c1yqBWxWQxQp0Q6qGeu1Jf0Y5qZ5f5hW8wKx4gk0lqKQ3q7mW')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (name, department_id)
SELECT v.name, d.id FROM (VALUES
('Pothole / Road Damage','ROADS'),
('Broken Streetlight','ELECTRICAL'),
('Garbage Overflow','SANITATION'),
('Damaged Sidewalk','ROADS'),
('Water Leakage','WATER'),
('Damaged Road Sign','ROADS'),
('Fallen Tree','PARKS'),
('Damaged Public Property','PUBLIC_WORKS'),
('Drainage Problem','WATER'),
('Other','MUNICIPAL')
) v(name, code)
JOIN departments d ON d.code=v.code
ON CONFLICT (name) DO NOTHING;

-- Additional realistic records can be generated after department hashes are installed.
