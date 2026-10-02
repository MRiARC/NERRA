"""Auth package — register, login, and JWT-protected routes.

This package is the **worked example**: it is complete on purpose, so you can
read it end to end and see how a real feature flows through the app's layers:

    router (HTTP)  ->  security helpers (crypto)  ->  models (database)

Start with router.py, then read security.py, then dependencies.py. The
ARCHITECTURE_GUIDE (docs/) walks through it line by line.
"""
