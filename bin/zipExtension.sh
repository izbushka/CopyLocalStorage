#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR/..
rm copyLocalStorage.zip

ls |grep -v bin|grep -v screenshots | xargs zip -r copyLocalStorage.zip

