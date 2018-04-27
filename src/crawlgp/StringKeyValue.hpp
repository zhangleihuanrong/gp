#ifndef __STRING_KEY_VALUE_HPP
#define __STRING_KEY_VALUE_HPP

#include <string>

struct StringKeyValue {
  std::string key_;
  std::string value_;

  StringKeyValue() = default;

  StringKeyValue(const StringKeyValue& a) = default;

  StringKeyValue(StringKeyValue&& a) = default;

  StringKeyValue& operator=(const StringKeyValue& a) = default;

  StringKeyValue& operator=(StringKeyValue&& a) = default;

  StringKeyValue(std::string&& key, std::string&& value)
    : key_(key), value_(value)
  {
  }
};

#endif
