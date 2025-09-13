module.exports = (sequelize, DataTypes) => {
  const FileUpload = sequelize.define('FileUpload', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mission_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'audit_missions',
        key: 'id'
      }
    },
    original_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    stored_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    category: {
      type: DataTypes.ENUM('document', 'image', 'report', 'scan_result', 'other'),
      defaultValue: 'other'
    },
    inventory_item_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'inventory_items', key: 'id' }
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'file_uploads',
    timestamps: true,
    createdAt: 'uploaded_at',
    updatedAt: false
  });

  // Associations
  FileUpload.associate = (models) => {
    FileUpload.belongsTo(models.AuditMission, {
      foreignKey: 'mission_id',
      as: 'mission'
    });
    FileUpload.belongsTo(models.User, {
      foreignKey: 'uploaded_by',
      as: 'uploader'
    });
    FileUpload.belongsTo(models.InventoryItem, {
      foreignKey: 'inventory_item_id',
      as: 'inventoryItem'
    });
  };

  return FileUpload;
};
