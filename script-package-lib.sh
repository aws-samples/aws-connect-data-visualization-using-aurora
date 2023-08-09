# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# Permission is hereby granted, free of charge, to any person obtaining a copy of this
# software and associated documentation files (the "Software"), to deal in the Software
# without restriction, including without limitation the rights to use, copy, modify,
# merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
# INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
# PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
# OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
# SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

#!/bin/bash

set -ex

# EXT_LIB_DIR='dist/stack/lib/layer/external-lib/nodejs/node_modules'

EXT_LIB_DIR='dist/stack/lib/layer/external-lib/nodejs/node_modules'

# Package code
mkdir -p $EXT_LIB_DIR
cd $EXT_LIB_DIR
cd ../
touch package.json
echo '{
  "dependencies": {
    "@aws-sdk/client-connect": "^3.142.0",
    "@aws-sdk/client-lambda": "^3.267.0",
    "@aws-sdk/rds-signer": "^3.263.0",
    "cfn-response": "^1.0.1",
    "uuid": "^8.3.2",
    "mysql2": "^3.1.0"
  }
}' > package.json
cd node_modules
npm i @aws-sdk/client-connect
npm i @aws-sdk/client-lambda
npm i @aws-sdk/rds-signer
npm i uuid
npm i cfn-response
npm i mysql2
