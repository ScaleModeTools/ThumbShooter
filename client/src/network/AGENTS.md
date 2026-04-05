# Network Agents

The `network` domain starts with local persistence and later expands to remote
contracts if the game needs them.

## Rules

- Treat browser storage as a boundary and define typed records for everything
  saved there.
- Keep serialization and parsing logic isolated from gameplay code.
- If a remote API appears later, define shared contracts before transport code.
