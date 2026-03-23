CREATE POLICY "Org members can delete apportionments" 
    ON claim_apportionments 
    FOR DELETE 
    USING (
      EXISTS (
        SELECT 1 
        FROM organisation_users ou 
        WHERE ou.org_id = claim_apportionments.org_id 
        AND ou.user_id = auth.uid()
      )
    );