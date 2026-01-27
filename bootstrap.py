from pathlib import Path

STRUCTURE = [
    "src/app.ts",
    "src/server.ts",
    "src/config/env.ts",
    "src/config/prisma.ts",

    "src/modules/auth/auth.routes.ts",
    "src/modules/auth/auth.controller.ts",
    "src/modules/auth/auth.service.ts",
    "src/modules/auth/auth.schemas.ts",

    "src/modules/users/users.routes.ts",
    "src/modules/users/users.controller.ts",
    "src/modules/users/users.service.ts",

    "src/middlewares/auth.middleware.ts",
    "src/middlewares/error.middleware.ts",
    "src/middlewares/validate.middleware.ts",

    "src/utils/jwt.ts",
    "src/utils/password.ts",
    "src/utils/google.ts",
    "src/utils/httpError.ts",
    "src/utils/logger.ts",

    "src/types/express.d.ts",

    "prisma/schema.prisma",

    ".env.example",
    "package.json",
    "tsconfig.json",
    "README.md",
]

def main():
    root = Path.cwd()

    # folders first
    for rel in STRUCTURE:
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)

    # files (empty if not exists)
    for rel in STRUCTURE:
        path = root / rel
        if not path.exists():
            path.write_text("", encoding="utf-8")

    print("✅ Project scaffold created.")
    print(f"Root: {root}")

if __name__ == "__main__":
    main()
