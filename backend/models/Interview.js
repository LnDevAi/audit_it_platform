module.exports = (sequelize, DataTypes) => {
  const Interview = sequelize.define('Interview', {
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
    interviewee_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    interviewee_function: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    interviewee_department: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    interview_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    focus_areas: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('focus_areas');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('focus_areas', JSON.stringify(value));
      }
    },
    key_points: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    recommendations: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('planned', 'completed', 'cancelled'),
      defaultValue: 'planned'
    },
    conducted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'interviews',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Interview;
};
