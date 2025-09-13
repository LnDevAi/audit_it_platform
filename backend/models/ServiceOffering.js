module.exports = (sequelize, DataTypes) => {
  const ServiceOffering = sequelize.define('ServiceOffering', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'organizations',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM(
        'security_audit',
        'penetration_test',
        'training',
        'msp_support',
        'hardening',
        'backup_dr',
        'cloud_migration',
        'consulting',
        'incident_response'
      ),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    price_cents: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'XOF'
    },
    sla_hours: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'service_offerings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['organization_id'] },
      { fields: ['category'] },
      { fields: ['active'] }
    ]
  });

  ServiceOffering.associate = (models) => {
    ServiceOffering.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
    ServiceOffering.hasMany(models.ServiceOrder, {
      foreignKey: 'offering_id',
      as: 'orders'
    });
  };

  return ServiceOffering;
};

