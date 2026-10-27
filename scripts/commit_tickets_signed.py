#!/usr/bin/env python3
"""Commit changed ticket files to main through the GitHub API (CI only).

A commit made with the GraphQL createCommitOnBranch mutation is signed by GitHub,
so it shows as Verified, and it is authored by the owner of GH_TOKEN (the
PROJECT_TOKEN secret) instead of a bot.

Usage: python3 scripts/commit_tickets_signed.py "commit message"
"""
import base64
import json
import os
import subprocess
import sys

msg = sys.argv[1] if len(sys.argv) > 1 else "tickets: sync from Issues"
repo = os.environ["GITHUB_REPOSITORY"]
branch = os.environ.get("TARGET_BRANCH", "main")


def run(*args, stdin=None):
    return subprocess.run(args, check=True, text=True, capture_output=True, input=stdin).stdout


changed = [l[3:] for l in run("git", "status", "--porcelain", "--", "tickets").splitlines()]
if not changed:
    print("Ticket files already in sync.")
    sys.exit(0)

additions, deletions = [], []
for path in changed:
    if os.path.exists(path):
        with open(path, "rb") as f:
            additions.append({"path": path, "contents": base64.b64encode(f.read()).decode()})
    else:
        deletions.append({"path": path})

query = """mutation($input: CreateCommitOnBranchInput!) {
  createCommitOnBranch(input: $input) { commit { oid url } } }"""
for attempt in range(3):
    head = run("gh", "api", f"repos/{repo}/git/ref/heads/{branch}", "--jq", ".object.sha").strip()
    body = {"query": query, "variables": {"input": {
        "branch": {"repositoryNameWithOwner": repo, "branchName": branch},
        "message": {"headline": msg},
        "fileChanges": {"additions": additions, "deletions": deletions},
        "expectedHeadOid": head}}}
    r = subprocess.run(["gh", "api", "graphql", "--input", "-"], text=True,
                       capture_output=True, input=json.dumps(body))
    if r.returncode == 0 and '"errors"' not in r.stdout:
        print(json.loads(r.stdout)["data"]["createCommitOnBranch"]["commit"]["url"])
        sys.exit(0)
    print(f"attempt {attempt + 1} failed: {r.stdout or r.stderr}", file=sys.stderr)
sys.exit(1)
