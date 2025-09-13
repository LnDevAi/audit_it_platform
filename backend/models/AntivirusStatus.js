module.exports = (sequelize, DataTypes) => {
  const AntivirusStatus = sequelize.define('AntivirusStatus', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    inventory_item_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inventory_items', key: 'id' } },
    vendor: { type: DataTypes.STRING(255), allowNull: true },
    product: { type: DataTypes.STRING(255), allowNull: true },
    version: { type: DataTypes.STRING(100), allowNull: true },
    real_time_protection: { type: DataTypes.BOOLEAN, defaultValue: false },
    last_scan_at: { type: DataTypes.DATE, allowNull: true },
    defs_version: { type: DataTypes.STRING(100), allowNull: true },
    defs_date: { type: DataTypes.DATEONLY, allowNull: true },
    performance_impact: { type: DataTypes.ENUM('low', 'medium', 'high'), defaultValue: 'low' }
  }, {
    tableName: 'antivirus_statuses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['inventory_item_id'] }, { fields: ['vendor'] }]
  });

  AntivirusStatus.associate = (models) => {
    AntivirusStatus.belongsTo(models.InventoryItem, { foreignKey: 'inventory_item_id', as: 'inventoryItem' });
  };

  return AntivirusStatus;
};

