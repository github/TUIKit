---
kind: preview
component: Table
version: 1
---

## Basic

```props
headers: ["Command", "Description"]
rows:
  - ["/help", "Show all commands"]
  - ["/theme", "Change color theme"]
  - ["/clear", "Clear conversation"]
```

## Borderless key-value

```props
rows:
  - ["Type", "stdio"]
  - ["Status", "Connected"]
  - ["Model", "GPT-4"]
borderStyle: "none"
```

## Right-aligned numbers

```props
headers: ["Metric", "Value", "Unit"]
rows:
  - ["Latency", "42", "ms"]
  - ["Tokens", "1234", "tok"]
  - ["Cost", "0.03", "USD"]
align: ["left", "right", "left"]
```

## Width-constrained

```props
headers: ["Error", "Message"]
rows:
  - ["E001", "Missing required field 'name' in configuration"]
  - ["E002", "Connection timeout after 30 seconds"]
width: 60
```
