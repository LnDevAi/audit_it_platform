module.exports = (sequelize, DataTypes) => {
  const WifiSecurityIssue = sequelize.define('WifiSecurityIssue', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ap_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'wifi_access_points', key: 'id' } },
    type: { type: DataTypes.ENUM('weak_encryption', 'open_network', 'shared_ssid', 'default_credentials', 'rogue_ap'), allowNull: false },
    severity: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
    description: { type: DataTypes.TEXT, allowNull: true },
    detected_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'wifi_security_issues',
    timestamps: false,
    indexes: [{ fields: ['ap_id', 'severity'] }]
  });

  WifiSecurityIssue.associate = (models) => {
    WifiSecurityIssue.belongsTo(models.WifiAccessPoint, { foreignKey: 'ap_id', as: 'ap' });
  };

  return WifiSecurityIssue;
};

