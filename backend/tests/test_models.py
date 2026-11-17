from app.models import SecurityEvent, User


def test_create_user_and_event(db):
    user = User(
        email="roundtrip@sentinel.local",
        password_hash="hashed",
        full_name="Round Trip",
        role="analyst",
    )
    db.add(user)
    db.flush()

    event = SecurityEvent(
        source_ip="192.168.1.100",
        dest_ip="10.0.0.5",
        source_port=54321,
        dest_port=22,
        protocol="TCP",
        event_type="ssh_login_failed",
        raw_log="Nov 15 10:23:45 firewall kernel: DROP SRC=192.168.1.100 DST=10.0.0.5 DPT=22",
        source_format="syslog",
    )
    db.add(event)
    db.flush()

    db.refresh(user)
    db.refresh(event)

    assert user.id is not None
    assert str(user.email) == "roundtrip@sentinel.local"
    assert event.id is not None
    assert str(event.source_ip) == "192.168.1.100"
    assert event.status == "pending"
