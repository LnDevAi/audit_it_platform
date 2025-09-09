module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'audit_missions',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('inventory', 'infrastructure', 'mapping', 'vulnerabilities', 'security', 'final'),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    format: {
      type: DataTypes.ENUM('pdf', 'word', 'excel', 'html'),
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    generated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    generated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'reports',
    timestamps: false
  });

  // Associations
  Report.associate = (models) => {
    Report.belongsTo(models.AuditMission, {
      foreignKey: 'mission_id',
      as: 'mission'
    });
  };

  return Report;
};
