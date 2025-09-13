module.exports = (sequelize, DataTypes) => {
  const ServiceReport = sequelize.define('ServiceReport', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    service_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'service_orders', key: 'id' }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    format: {
      type: DataTypes.ENUM('pdf', 'html', 'markdown'),
      defaultValue: 'pdf'
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    generated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    generated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'service_reports',
    timestamps: false,
    indexes: [
      { fields: ['service_order_id'] }
    ]
  });

  ServiceReport.associate = (models) => {
    ServiceReport.belongsTo(models.ServiceOrder, { foreignKey: 'service_order_id', as: 'order' });
    ServiceReport.belongsTo(models.User, { foreignKey: 'generated_by', as: 'author' });
  };

  return ServiceReport;
};

