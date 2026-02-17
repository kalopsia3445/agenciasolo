#!/bin/bash
echo "--- LOGO FILES ---"
ls -la LogoMarcaAgenciaSolo.png
ls -la public/logo-agencia-solo.png
echo "--- GIT STATUS ---"
git status
echo "--- LAST COMMITS ---"
git log -n 3
echo "--- REMOTE ---"
git remote -v
