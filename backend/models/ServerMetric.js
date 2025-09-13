module.exports = (sequelize, DataTypes) => {
  const ServerMetric = sequelize.define('ServerMetric', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    network_device_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'network_devices', key: 'id' } },
    cpu_percent: { type: DataTypes.FLOAT, allowNull: true },
    mem_percent: { type: DataTypes.FLOAT, allowNull: true },
    disk_percent: { type: DataTypes.FLOAT, allowNull: true },
    load_1m: { type: DataTypes.FLOAT, allowNull: true },
    load_5m: { type: DataTypes.FLOAT, allowNull: true },
    load_15m: { type: DataTypes.FLOAT, allowNull: true },
    collected_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'server_metrics',
    timestamps: false,
    indexes: [{ fields: ['network_device_id', 'collected_at'] }]
  });

  ServerMetric.associate = (models) => {
    ServerMetric.belongsTo(models.NetworkDevice, { foreignKey: 'network_device_id', as: 'server' });
  };

  return ServerMetric;
};

