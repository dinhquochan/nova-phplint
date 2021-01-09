#!/bin/sh

BUILD_VERSION="$1"

npm run build
cp -f README.md PHPLint.novaextension/
cp -f LICENSE.md PHPLint.novaextension/
cp -f CHANGELOG.md PHPLint.novaextension/
git add .
git commit -m "version ${BUILD_VERSION}"
git tag $BUILD_VERSION
