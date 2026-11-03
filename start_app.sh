#!/bin/bash
echo "Starting Sri Sakthi Xerox Local Server..."

if [ -f "./venv/bin/python" ]; then
    PYTHON_EXEC="./venv/bin/python"
else
    PYTHON_EXEC="python3"
fi

$PYTHON_EXEC app.py
