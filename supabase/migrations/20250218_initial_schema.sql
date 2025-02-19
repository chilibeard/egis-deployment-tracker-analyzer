-- Create deployments table
CREATE TABLE deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'in_progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deployment_phases table
CREATE TABLE deployment_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    phase_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create log_entries table
CREATE TABLE log_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES deployment_phases(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT NOT NULL,
    file_path TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create processing_tasks table
CREATE TABLE processing_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    file_size BIGINT NOT NULL,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file_relationships table
CREATE TABLE file_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    source_file TEXT NOT NULL,
    related_file TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_log_entries_deployment_id ON log_entries(deployment_id);
CREATE INDEX idx_log_entries_phase_id ON log_entries(phase_id);
CREATE INDEX idx_log_entries_timestamp ON log_entries(timestamp);
CREATE INDEX idx_log_entries_level ON log_entries(level);
CREATE INDEX idx_processing_tasks_status ON processing_tasks(status);
CREATE INDEX idx_processing_tasks_deployment_id ON processing_tasks(deployment_id);
CREATE INDEX idx_deployment_phases_deployment_id ON deployment_phases(deployment_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_deployments_updated_at
    BEFORE UPDATE ON deployments
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_deployment_phases_updated_at
    BEFORE UPDATE ON deployment_phases
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_processing_tasks_updated_at
    BEFORE UPDATE ON processing_tasks
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create RLS policies
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_relationships ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access for authenticated users"
ON deployments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access for authenticated users"
ON deployment_phases FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access for authenticated users"
ON log_entries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access for authenticated users"
ON processing_tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access for authenticated users"
ON file_relationships FOR SELECT
TO authenticated
USING (true);

-- Allow insert/update access to service role only
CREATE POLICY "Allow insert/update for service role"
ON deployments FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow insert/update for service role"
ON deployment_phases FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow insert/update for service role"
ON log_entries FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow insert/update for service role"
ON processing_tasks FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow insert/update for service role"
ON file_relationships FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
