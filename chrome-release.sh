#!/bin/bash

CWD=$(pwd)

mkdir package/
cp -r css/ img/ js/ manifest.json package/
cd package/
shopt -s extglob
for file in js/!(*.min).js css/!(*.min).css; do
    yuicompressor $file -o $file
done
shopt -u extglob

version=$(cat manifest.json | awk '/"version"/ { gsub(/[",]/,""); print $2 }')
zip -r $CWD/scumdar-$version.zip .
cd $CWD
rm -rf package/
[[ $1 != 'test' ]] && git tag -a v$version -m "version $version"
