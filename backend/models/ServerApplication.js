module.exports = (sequelize, DataTypes) => {
  const ServerApplication = sequelize.define('ServerApplication', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    network_device_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'network_devices', key: 'id' } },
    name: { type: DataTypes.STRING(255), allowNull: false },
    version: { type: DataTypes.STRING(100), allowNull: true },
    process_name: { type: DataTypes.STRING(255), allowNull: true },
    port: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.ENUM('running', 'stopped', 'degraded'), defaultValue: 'running' }
  }, {
    tableName: 'server_applications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['network_device_id'] }, { fields: ['name'] }]
  });

  ServerApplication.associate = (models) => {
    ServerApplication.belongsTo(models.NetworkDevice, { foreignKey: 'network_device_id', as: 'server' });
  };

  return ServerApplication;
};

