require "jssluz" unless defined? JSSluz
require "rails"

module JSSluz
    module Rails
        if ::Rails.version.to_s < "3.1"
            require "jssluz/assets/railtie"
        else
            require "jssluz/assets/engine"
        end
    end
end