module.exports = (sequelize, DataTypes) => {
  const BackupConfig = sequelize.define('BackupConfig', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    organization_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
    strategy: { type: DataTypes.ENUM('full', 'incremental', 'differential', 'mixed'), defaultValue: 'full' },
    schedule_cron: { type: DataTypes.STRING(100), allowNull: true },
    retention_days: { type: DataTypes.INTEGER, defaultValue: 30 },
    offsite_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    tested_at: { type: DataTypes.DATE, allowNull: true },
    last_success_at: { type: DataTypes.DATE, allowNull: true },
    tooling: { type: DataTypes.STRING(255), allowNull: true }
  }, {
    tableName: 'backup_configs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['organization_id'] }]
  });

  BackupConfig.associate = (models) => {
    BackupConfig.belongsTo(models.Organization, { foreignKey: 'organization_id', as: 'organization' });
  };

  return BackupConfig;
};

