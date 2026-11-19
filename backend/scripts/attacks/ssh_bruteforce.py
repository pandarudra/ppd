"""SSH brute force: one attacker hammering port 22 (many dropped/failed logins).   python ssh_bruteforce.py [--src IP]"""
from _common import run, syslog

run("ssh_bruteforce", lambda s, d, i: syslog(s, d, 22, "DROP fail"), default_count=40)
