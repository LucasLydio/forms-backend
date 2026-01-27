from pathlib import Path

NEW_FILES = [
    # Forms module
    "src/modules/forms/forms.routes.ts",
    "src/modules/forms/forms.controller.ts",
    "src/modules/forms/forms.service.ts",
    "src/modules/forms/forms.schemas.ts",

    # Submissions module
    "src/modules/submissions/submissions.routes.ts",
    "src/modules/submissions/submissions.controller.ts",
    "src/modules/submissions/submissions.service.ts",
    "src/modules/submissions/submissions.schemas.ts",
]

def main():
    root = Path.cwd()
    for rel in NEW_FILES:
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            path.write_text("", encoding="utf-8")

    print("✅ Forms/Submissions module files created (empty).")

if __name__ == "__main__":
    main()
