module.exports = (sequelize, DataTypes) => {
  const SoftwareInstallation = sequelize.define('SoftwareInstallation', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    inventory_item_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inventory_items', key: 'id' } },
    name: { type: DataTypes.STRING(255), allowNull: false },
    version: { type: DataTypes.STRING(100), allowNull: true },
    vendor: { type: DataTypes.STRING(255), allowNull: true },
    install_date: { type: DataTypes.DATEONLY, allowNull: true },
    license_key: { type: DataTypes.STRING(255), allowNull: true },
    license_expiry: { type: DataTypes.DATEONLY, allowNull: true },
    critical: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    tableName: 'software_installations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['inventory_item_id'] }, { fields: ['name'] }]
  });

  SoftwareInstallation.associate = (models) => {
    SoftwareInstallation.belongsTo(models.InventoryItem, { foreignKey: 'inventory_item_id', as: 'inventoryItem' });
  };

  return SoftwareInstallation;
};

