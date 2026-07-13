#!/bin/bash
# Script de backup y restauración para Inventario VD
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"
BACKUP_DIR="./backups"

mkdir -p "$BACKUP_DIR"

case "$1" in
  backup)
    echo "📦 Creando backup: $BACKUP_DIR/$BACKUP_FILE"
    docker exec inventario-db pg_dump -U postgres inventario > "$BACKUP_DIR/$BACKUP_FILE"
    echo "✅ Backup completado: $BACKUP_FILE"
    ;;
  restore)
    if [ -z "$2" ]; then
      echo "❌ Uso: ./backup.sh restore <archivo.sql>"
      exit 1
    fi
    echo "🔄 Restaurando desde: $2"
    docker exec -i inventario-db psql -U postgres inventario < "$2"
    echo "✅ Restauración completada"
    ;;
  list)
    echo "📋 Backups disponibles:"
    ls -lh "$BACKUP_DIR"/*.sql 2>/dev/null || echo "  (ninguno)"
    ;;
  *)
    echo "Uso: ./backup.sh {backup|restore <file>|list}"
    ;;
esac