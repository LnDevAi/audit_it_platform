module.exports = (sequelize, DataTypes) => {
  const WifiAccessPoint = sequelize.define('WifiAccessPoint', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    site_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'audit_sites', key: 'id' } },
    ssid: { type: DataTypes.STRING(255), allowNull: false },
    bssid: { type: DataTypes.STRING(17), allowNull: true },
    band: { type: DataTypes.ENUM('2.4GHz', '5GHz', '6GHz'), defaultValue: '2.4GHz' },
    channel: { type: DataTypes.INTEGER, allowNull: true },
    encryption: { type: DataTypes.ENUM('OPEN', 'WPA2', 'WPA3', 'WPA2-Enterprise', 'WPA3-Enterprise'), defaultValue: 'WPA2' },
    vlan: { type: DataTypes.STRING(50), allowNull: true },
    vendor: { type: DataTypes.STRING(255), allowNull: true },
    tx_power_dbm: { type: DataTypes.FLOAT, allowNull: true },
    status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' }
  }, {
    tableName: 'wifi_access_points',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['site_id'] }, { fields: ['ssid'] }]
  });

  WifiAccessPoint.associate = (models) => {
    WifiAccessPoint.belongsTo(models.AuditSite, { foreignKey: 'site_id', as: 'site' });
    WifiAccessPoint.hasMany(models.WifiSurvey, { foreignKey: 'ap_id', as: 'surveys' });
  };

  return WifiAccessPoint;
};

