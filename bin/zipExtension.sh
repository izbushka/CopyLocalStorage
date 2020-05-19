#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR/..
rm copyLocalStorage.zip

VERSION=$(grep -i '"version"' manifest.json | sed 's/[^1-9.]\+//g')
NEW_VERSION=$(echo "$VERSION + 0.1" | bc)

REGEXP='s/"version":.*/"version": "'$NEW_VERSION'",/'
sed -i "$REGEXP" manifest.json
ls |grep -v bin|grep -v screenshots | xargs zip -r copyLocalStorage.zip

echo "Version $NEW_VERSION built"

