create policy "server_can_create_claim_projects"
on claim_projects
for insert
to anon
with check (true);