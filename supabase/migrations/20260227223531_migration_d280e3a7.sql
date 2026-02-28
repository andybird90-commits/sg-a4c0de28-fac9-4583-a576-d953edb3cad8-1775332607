create policy "server_can_create_claims"
    on claims
    for insert
    to anon
    with check (true);