def normalize_branch_name(name: str | None) -> str:
    value = (name or "").strip()
    return value or "Front Desk"
