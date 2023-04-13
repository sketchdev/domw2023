#!/bin/ash
DEFAULT_SLEEP_SECS=10
SLEEP_SECS=${1:-$DEFAULT_SLEEP_SECS}
AWS_REQUEST_ID=${2:-undefined}
echo "Starting my simulated batch execution. Estimated runtime: $SLEEP_SECS seconds for requestId: $AWS_REQUEST_ID ..."
sleep $SLEEP_SECS
echo "Batch complete for requestId: $AWS_REQUEST_ID"