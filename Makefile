.PHONY: migration-create migration-generate migration-run migration-revert

migration-create:
	@read -p "Enter migration name: " name; \
	pnpm run typeorm migration:create src/database/migrations/$$name

migration-generate:
	@read -p "Enter migration name: " name; \
	pnpm run typeorm migration:generate src/database/migrations/$$name -d src/database/data-source.ts

migration-run:
	pnpm run typeorm migration:run -d src/database/data-source.ts

migration-revert:
	pnpm run typeorm migration:revert -d src/database/data-source.ts

migration-show:
	pnpm run typeorm migration:show -d src/database/data-source.ts