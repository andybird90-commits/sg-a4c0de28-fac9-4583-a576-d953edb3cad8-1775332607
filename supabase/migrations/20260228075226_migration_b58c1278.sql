create policy "clients_can_create_claims"
    on claims
    for insert
    to authenticated
    with check (true);