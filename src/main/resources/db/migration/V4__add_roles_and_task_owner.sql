ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER';

ALTER TABLE tasks ADD COLUMN user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
-- tasks created before owners existed go to the first account (the seeded admin)
UPDATE tasks SET user_id = (SELECT MIN(id) FROM users);

-- titles only need to be unique per user now
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_title_key;
ALTER TABLE tasks ADD CONSTRAINT tasks_user_title_key UNIQUE (user_id, title);
