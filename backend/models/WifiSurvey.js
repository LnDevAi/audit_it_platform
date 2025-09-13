module.exports = (sequelize, DataTypes) => {
  const WifiSurvey = sequelize.define('WifiSurvey', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ap_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'wifi_access_points', key: 'id' } },
    rssi_dbm: { type: DataTypes.FLOAT, allowNull: true },
    snr_db: { type: DataTypes.FLOAT, allowNull: true },
    throughput_mbps: { type: DataTypes.FLOAT, allowNull: true },
    packet_loss_percent: { type: DataTypes.FLOAT, allowNull: true },
    jitter_ms: { type: DataTypes.FLOAT, allowNull: true },
    measured_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    location_hint: { type: DataTypes.STRING(255), allowNull: true }
  }, {
    tableName: 'wifi_surveys',
    timestamps: false,
    indexes: [{ fields: ['ap_id', 'measured_at'] }]
  });

  WifiSurvey.associate = (models) => {
    WifiSurvey.belongsTo(models.WifiAccessPoint, { foreignKey: 'ap_id', as: 'ap' });
  };

  return WifiSurvey;
};

