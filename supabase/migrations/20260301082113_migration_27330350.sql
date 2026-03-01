-- 1) Allow any authenticated user in the organisation to create claim_projects
    CREATE POLICY "clients_can_create_claim_projects"
    ON claim_projects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM organisation_users ou
        WHERE ou.org_id = claim_projects.org_id
          AND ou.user_id = auth.uid()
      )
    );

    -- 2) Allow any authenticated user in the organisation to update their org's claim_projects
    CREATE POLICY "clients_can_update_claim_projects"
    ON claim_projects
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM organisation_users ou
        WHERE ou.org_id = claim_projects.org_id
          AND ou.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM organisation_users ou
        WHERE ou.org_id = claim_projects.org_id
          AND ou.user_id = auth.uid()
      )
    );

    -- 3) Allow any authenticated user in the organisation to view their org's claim_projects
    CREATE POLICY "clients_can_view_claim_projects"
    ON claim_projects
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM organisation_users ou
        WHERE ou.org_id = claim_projects.org_id
          AND ou.user_id = auth.uid()
      )
    );

    -- 4) Allow the server (anon key used in Next.js API) to select claim_projects so INSERT ... SELECT works
    CREATE POLICY "server_can_view_claim_projects"
    ON claim_projects
    FOR SELECT
    TO anon
    USING (true);