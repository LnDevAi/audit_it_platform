module.exports = (sequelize, DataTypes) => {
  const BackupEvent = sequelize.define('BackupEvent', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    organization_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
    type: { type: DataTypes.ENUM('backup', 'restore', 'test'), defaultValue: 'backup' },
    status: { type: DataTypes.ENUM('success', 'failed', 'partial'), defaultValue: 'success' },
    started_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    finished_at: { type: DataTypes.DATE, allowNull: true },
    size_bytes: { type: DataTypes.BIGINT, allowNull: true },
    location: { type: DataTypes.STRING(255), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'backup_events',
    timestamps: false,
    indexes: [{ fields: ['organization_id', 'started_at'] }]
  });

  BackupEvent.associate = (models) => {
    BackupEvent.belongsTo(models.Organization, { foreignKey: 'organization_id', as: 'organization' });
  };

  return BackupEvent;
};

