def test_login_success_and_invalid_credentials(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@sentinel.local", "password": "admin123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["user"]["email"] == "admin@sentinel.local"

    bad_response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@sentinel.local", "password": "wrong-password"},
    )
    assert bad_response.status_code == 401


def test_role_middleware_blocks_analyst_and_anonymous(client):
    analyst_login = client.post(
        "/api/v1/auth/login",
        json={"email": "analyst@sentinel.local", "password": "analyst123"},
    )
    assert analyst_login.status_code == 200
    analyst_token = analyst_login.json()["access_token"]

    forbidden = client.post(
        "/api/v1/users",
        json={
            "email": "new@sentinel.local",
            "password": "Pass1234!",
            "full_name": "New User",
            "role": "analyst",
        },
        headers={"Authorization": f"Bearer {analyst_token}"},
    )
    assert forbidden.status_code == 403

    unauthorized = client.post(
        "/api/v1/users",
        json={
            "email": "new2@sentinel.local",
            "password": "Pass1234!",
            "full_name": "New User 2",
            "role": "analyst",
        },
    )
    assert unauthorized.status_code == 401
