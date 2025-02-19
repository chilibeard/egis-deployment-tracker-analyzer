# Database Schema Design

## Core Tables

### 1. deployments
```sql
CREATE TABLE deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('initializing', 'enrolling', 'software_deployment', 'configuring', 'validating', 'completed', 'failed')),
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_update_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completion_time TIMESTAMPTZ,
    error_count INT NOT NULL DEFAULT 0,
    warning_count INT NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick status lookups
CREATE INDEX idx_deployments_status ON deployments(status);
-- Index for machine name searches
CREATE INDEX idx_deployments_machine_name ON deployments(machine_name);
```

### 2. deployment_phases
```sql
CREATE TABLE deployment_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL REFERENCES deployments(id),
    phase_name TEXT NOT NULL CHECK (phase_name IN ('initial_setup', 'device_enrollment', 'software_deployment', 'configuration', 'validation')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    start_time TIMESTAMPTZ,
    completion_time TIMESTAMPTZ,
    error_count INT NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(deployment_id, phase_name)
);

-- Index for phase status queries
CREATE INDEX idx_deployment_phases_status ON deployment_phases(status);
```

### 3. log_entries
```sql
CREATE TABLE log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL REFERENCES deployments(id),
    phase_id UUID REFERENCES deployment_phases(id),
    timestamp TIMESTAMPTZ NOT NULL,
    log_level TEXT NOT NULL CHECK (log_level IN ('INFO', 'WARNING', 'ERROR', 'DEBUG')),
    source_file TEXT NOT NULL,
    message TEXT NOT NULL,
    component TEXT,
    context JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for timestamp-based queries
CREATE INDEX idx_log_entries_timestamp ON log_entries(timestamp);
-- Index for log level filtering
CREATE INDEX idx_log_entries_level ON log_entries(log_level);
-- Index for deployment lookups
CREATE INDEX idx_log_entries_deployment ON log_entries(deployment_id);
```

### 4. installation_logs
```sql
CREATE TABLE installation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL REFERENCES deployments(id),
    phase_id UUID NOT NULL REFERENCES deployment_phases(id),
    application_name TEXT NOT NULL,
    version TEXT,
    status TEXT NOT NULL CHECK (status IN ('started', 'in_progress', 'completed', 'failed')),
    start_time TIMESTAMPTZ NOT NULL,
    completion_time TIMESTAMPTZ,
    error_code TEXT,
    error_message TEXT,
    install_location TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for application name searches
CREATE INDEX idx_installation_logs_app ON installation_logs(application_name);
```

### 5. configuration_logs
```sql
CREATE TABLE configuration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL REFERENCES deployments(id),
    phase_id UUID NOT NULL REFERENCES deployment_phases(id),
    config_type TEXT NOT NULL,
    component TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'applied', 'failed')),
    applied_at TIMESTAMPTZ,
    settings JSONB NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for component searches
CREATE INDEX idx_configuration_logs_component ON configuration_logs(component);
```

### 6. event_logs
```sql
CREATE TABLE event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL REFERENCES deployments(id),
    phase_id UUID NOT NULL REFERENCES deployment_phases(id),
    event_id INT NOT NULL,
    provider_name TEXT NOT NULL,
    channel TEXT NOT NULL,
    level TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    message TEXT NOT NULL,
    task_category TEXT,
    keywords TEXT[],
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for event ID lookups
CREATE INDEX idx_event_logs_event_id ON event_logs(event_id);
-- Index for provider searches
CREATE INDEX idx_event_logs_provider ON event_logs(provider_name);
```

### 7. error_tracking
```sql
CREATE TABLE error_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL REFERENCES deployments(id),
    phase_id UUID REFERENCES deployment_phases(id),
    error_type TEXT NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    frequency INT NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('new', 'investigating', 'resolved', 'ignored')),
    resolution_notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for error type analysis
CREATE INDEX idx_error_tracking_type ON error_tracking(error_type);
```

## Views

### 1. deployment_status_summary
```sql
CREATE VIEW deployment_status_summary AS
SELECT 
    d.machine_name,
    d.status as deployment_status,
    d.start_time,
    d.completion_time,
    d.error_count,
    d.warning_count,
    json_object_agg(dp.phase_name, dp.status) as phase_statuses,
    COUNT(DISTINCT e.id) as total_errors,
    COUNT(DISTINCT il.id) FILTER (WHERE il.status = 'completed') as completed_installations,
    COUNT(DISTINCT il.id) FILTER (WHERE il.status = 'failed') as failed_installations
FROM deployments d
LEFT JOIN deployment_phases dp ON d.id = dp.deployment_id
LEFT JOIN error_tracking e ON d.id = e.deployment_id
LEFT JOIN installation_logs il ON d.id = il.deployment_id
GROUP BY d.id, d.machine_name, d.status, d.start_time, d.completion_time, d.error_count, d.warning_count;
```

### 2. error_summary_by_phase
```sql
CREATE VIEW error_summary_by_phase AS
SELECT 
    d.machine_name,
    dp.phase_name,
    COUNT(DISTINCT e.id) as error_count,
    array_agg(DISTINCT e.error_type) as error_types,
    MAX(e.last_seen_at) as latest_error_time
FROM deployments d
JOIN deployment_phases dp ON d.id = dp.deployment_id
JOIN error_tracking e ON dp.id = e.phase_id
GROUP BY d.machine_name, dp.phase_name;
```

## Functions

### 1. update_deployment_status
```sql
CREATE OR REPLACE FUNCTION update_deployment_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE deployments
    SET status = 
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM deployment_phases 
                WHERE deployment_id = NEW.deployment_id 
                AND status = 'failed'
            ) THEN 'failed'
            WHEN NOT EXISTS (
                SELECT 1 FROM deployment_phases 
                WHERE deployment_id = NEW.deployment_id 
                AND status != 'completed'
            ) THEN 'completed'
            ELSE 'in_progress'
        END,
    updated_at = NOW()
    WHERE id = NEW.deployment_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deployment_status
AFTER INSERT OR UPDATE ON deployment_phases
FOR EACH ROW
EXECUTE FUNCTION update_deployment_status();
```

### 2. increment_error_counts
```sql
CREATE OR REPLACE FUNCTION increment_error_counts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE deployments
    SET error_count = error_count + 1,
        updated_at = NOW()
    WHERE id = NEW.deployment_id;
    
    IF NEW.phase_id IS NOT NULL THEN
        UPDATE deployment_phases
        SET error_count = error_count + 1,
            updated_at = NOW()
        WHERE id = NEW.phase_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_error_counts
AFTER INSERT ON error_tracking
FOR EACH ROW
EXECUTE FUNCTION increment_error_counts();
```

## Real-time Subscriptions

Enable real-time subscriptions for:
1. `deployments` table - status changes
2. `deployment_phases` table - phase transitions
3. `error_tracking` table - new errors
4. `installation_logs` table - installation status updates

## Processing Priority Queues

### High Priority Queue
- Windows Setup logs (setupact.log)
- Device enrollment events
- Installation status updates
- Critical error events

### Medium Priority Queue
- Configuration changes
- Application inventory updates
- Task creation logs
- Warning-level events

### Low Priority Queue
- Diagnostic reports
- Trace logs
- Backup logs
- Informational events

## Performance Considerations

1. **Partitioning Strategy**
   - Partition `log_entries` by month
   - Partition `event_logs` by month
   - Consider partitioning other large tables based on usage patterns

2. **Archival Strategy**
   - Move completed deployments older than 30 days to archive tables
   - Compress archived logs
   - Maintain summary data for historical analysis

3. **Indexing Strategy**
   - Use partial indexes for active deployments
   - Create composite indexes for common query patterns
   - Implement GiST indexes for text search on log messages

4. **Caching Strategy**
   - Cache deployment status summaries
   - Cache recent error counts
   - Cache active phase information
