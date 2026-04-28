-- Add user_id to words table
alter table words add column if not exists user_id text default 'dong';

-- Update existing rows to have 'dong' as user_id
update words set user_id = 'dong' where user_id is null;

-- Add user_id to learning_logs table
alter table learning_logs add column if not exists user_id text default 'dong';

-- Update existing rows to have 'dong' as user_id
update learning_logs set user_id = 'dong' where user_id is null;