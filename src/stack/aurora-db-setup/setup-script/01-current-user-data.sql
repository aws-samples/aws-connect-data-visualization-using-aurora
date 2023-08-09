CREATE TABLE IF NOT EXISTS current_user_data (
  user_arn VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,  /* changed this on 1-/28*/
  routing_profile_arn VARCHAR(255),
  routing_profile_name VARCHAR(255) NOT NULL, /* Added to capture RP name */
  status_start_time VARCHAR(255),
  status_name VARCHAR(255) NOT NULL, /* Added to capture status name */
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_arn)
);