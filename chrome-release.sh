#!/bin/sh

version=$(cat manifest.json | awk '/"version"/ { gsub(/[",]/,""); print $2 }')
zip -r scumdar-$version.zip . -x chrome-release.sh .git/\* README.md
git tag -a v$version -m "version $version"
