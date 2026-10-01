# Product specifications

OpenSpec records product requirements and planned changes separately from implementation. Main specifications live in `specs/`; active proposals and work plans live under `changes/`; completed changes are archived under `changes/archive/`.

## Working with a feature

Before changing behavior, search `specs/` for the owning capability and check whether a related change is active. If requirements are missing or behavior is new, create/update a change proposal with requirements, design and tasks before implementation. Keep acceptance scenarios aligned with the app's shared rules, database enforcement and web/mobile flows.

When implementation is complete, verify the change artifacts and implementation, mark tasks complete, then archive the change using the repository's installed OpenSpec CLI. An archived task list is historical context; the current capability specification and code are the live contract.

Use the root [development guide](../docs/development.md) for the repository's change workflow and [architecture guide](../docs/architecture.md) to find owning modules.
