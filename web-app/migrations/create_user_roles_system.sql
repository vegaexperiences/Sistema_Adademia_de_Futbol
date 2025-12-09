-- ============================================
-- User Roles and Permissions System
-- ============================================
-- This migration creates the foundation for role-based access control
-- Users can have different roles in different academies

-- 1. Create user_roles table (defines available roles)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- e.g., 'admin', 'manager', 'staff', 'viewer'
  display_name TEXT NOT NULL, -- e.g., 'Administrador', 'Gerente', 'Personal', 'Visualizador'
  description TEXT,
  is_system_role BOOLEAN DEFAULT false, -- System roles cannot be deleted
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_name ON user_roles(name);

-- 2. Create user_permissions table (defines available permissions)
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- e.g., 'view_players', 'edit_players', 'manage_payments'
  display_name TEXT NOT NULL, -- e.g., 'Ver Jugadores', 'Editar Jugadores', 'Gestionar Pagos'
  module TEXT NOT NULL, -- e.g., 'players', 'payments', 'families', 'finances', 'settings', 'emails'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_name ON user_permissions(name);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_permissions(module);

-- 3. Create role_permissions table (defines which permissions each role has)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES user_roles(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES user_permissions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(role_id, permission_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- 4. Create user_role_assignments table (assigns roles to users per academy)
CREATE TABLE IF NOT EXISTS user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES user_roles(id) ON DELETE CASCADE NOT NULL,
  academy_id UUID REFERENCES academies(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who assigned this role
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id, academy_id) -- A user can only have one role per academy
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_academy_id ON user_role_assignments(academy_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_academy ON user_role_assignments(user_id, academy_id);

-- 5. Enable RLS on all tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for user_roles (everyone can read, only super admins can modify)
CREATE POLICY "Allow public read user_roles"
  ON user_roles
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow super admins to manage user_roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
    )
  );

-- 7. RLS Policies for user_permissions (everyone can read, only super admins can modify)
CREATE POLICY "Allow public read user_permissions"
  ON user_permissions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow super admins to manage user_permissions"
  ON user_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
    )
  );

-- 8. RLS Policies for role_permissions (everyone can read, only super admins can modify)
CREATE POLICY "Allow public read role_permissions"
  ON role_permissions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow super admins to manage role_permissions"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
    )
  );

-- 9. RLS Policies for user_role_assignments
-- Users can see their own assignments, super admins can see all
CREATE POLICY "Users can view their own role assignments"
  ON user_role_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
    )
  );

-- Only super admins can manage role assignments
CREATE POLICY "Allow super admins to manage role assignments"
  ON user_role_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
    )
  );

-- 10. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_role_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_roles_updated_at();

DROP TRIGGER IF EXISTS update_user_role_assignments_updated_at ON user_role_assignments;
CREATE TRIGGER update_user_role_assignments_updated_at
  BEFORE UPDATE ON user_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_user_role_assignments_updated_at();

-- 12. Insert default roles
INSERT INTO user_roles (name, display_name, description, is_system_role) VALUES
  ('super_admin', 'Super Administrador', 'Acceso total a todas las academias', true),
  ('admin', 'Administrador', 'Administración completa de una academia', true),
  ('manager', 'Gerente', 'Gestión de jugadores, pagos y reportes', true),
  ('staff', 'Personal', 'Operaciones básicas (ver, editar limitado)', true),
  ('viewer', 'Visualizador', 'Solo lectura', true)
ON CONFLICT (name) DO NOTHING;

-- 13. Insert default permissions
INSERT INTO user_permissions (name, display_name, module, description) VALUES
  -- Players permissions
  ('view_players', 'Ver Jugadores', 'players', 'Ver lista de jugadores'),
  ('create_players', 'Crear Jugadores', 'players', 'Crear nuevos jugadores'),
  ('edit_players', 'Editar Jugadores', 'players', 'Editar información de jugadores'),
  ('delete_players', 'Eliminar Jugadores', 'players', 'Eliminar jugadores'),
  ('approve_players', 'Aprobar Jugadores', 'players', 'Aprobar jugadores pendientes'),
  
  -- Payments permissions
  ('view_payments', 'Ver Pagos', 'payments', 'Ver lista de pagos'),
  ('create_payments', 'Crear Pagos', 'payments', 'Crear nuevos pagos'),
  ('edit_payments', 'Editar Pagos', 'payments', 'Editar información de pagos'),
  ('approve_payments', 'Aprobar Pagos', 'payments', 'Aprobar pagos pendientes'),
  ('reject_payments', 'Rechazar Pagos', 'payments', 'Rechazar pagos'),
  
  -- Families permissions
  ('view_families', 'Ver Familias', 'families', 'Ver lista de familias'),
  ('create_families', 'Crear Familias', 'families', 'Crear nuevas familias'),
  ('edit_families', 'Editar Familias', 'families', 'Editar información de familias'),
  ('delete_families', 'Eliminar Familias', 'families', 'Eliminar familias'),
  
  -- Finances permissions
  ('view_finances', 'Ver Finanzas', 'finances', 'Ver información financiera'),
  ('create_expenses', 'Crear Gastos', 'finances', 'Crear nuevos gastos'),
  ('edit_expenses', 'Editar Gastos', 'finances', 'Editar gastos'),
  ('view_reports', 'Ver Reportes', 'finances', 'Ver reportes financieros'),
  
  -- Settings permissions
  ('view_settings', 'Ver Configuración', 'settings', 'Ver configuración del sistema'),
  ('edit_settings', 'Editar Configuración', 'settings', 'Editar configuración del sistema'),
  
  -- Emails permissions
  ('view_emails', 'Ver Correos', 'emails', 'Ver historial de correos'),
  ('send_emails', 'Enviar Correos', 'emails', 'Enviar correos'),
  ('manage_templates', 'Gestionar Plantillas', 'emails', 'Gestionar plantillas de correo'),
  
  -- Users permissions
  ('view_users', 'Ver Usuarios', 'users', 'Ver lista de usuarios'),
  ('manage_users', 'Gestionar Usuarios', 'users', 'Gestionar usuarios y roles')
ON CONFLICT (name) DO NOTHING;

-- 14. Assign permissions to roles
-- Note: Super Admin has all permissions implicitly (checked in code)
-- Admin: All permissions except manage_users
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM user_roles WHERE name = 'admin'),
  id
FROM user_permissions
WHERE name != 'manage_users'
ON CONFLICT DO NOTHING;

-- Manager: View and edit permissions for players, payments, families; view for finances
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM user_roles WHERE name = 'manager'),
  id
FROM user_permissions
WHERE name IN (
  'view_players', 'create_players', 'edit_players', 'approve_players',
  'view_payments', 'create_payments', 'edit_payments', 'approve_payments',
  'view_families', 'create_families', 'edit_families',
  'view_finances', 'view_reports',
  'view_emails', 'send_emails'
)
ON CONFLICT DO NOTHING;

-- Staff: View and limited edit permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM user_roles WHERE name = 'staff'),
  id
FROM user_permissions
WHERE name IN (
  'view_players', 'create_players', 'edit_players',
  'view_payments', 'create_payments',
  'view_families', 'create_families', 'edit_families',
  'view_finances',
  'view_emails', 'send_emails'
)
ON CONFLICT DO NOTHING;

-- Viewer: Only view permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM user_roles WHERE name = 'viewer'),
  id
FROM user_permissions
WHERE name LIKE 'view_%'
ON CONFLICT DO NOTHING;

