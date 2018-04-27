#ifndef _HUANRONG_REDIS_KEYVALUE_WRITER_HPP
#define _HUANRONG_REDIS_KEYVALUE_WRITER_HPP

#include <thread>
#include <chrono>

#include "logging.h"
#include "StringKeyValue.hpp"
#include "concurrentList.hpp"

class RedisKeyValueWriter
{
protected:
    std::string name_;
    huanrong::ConcurrentList<StringKeyValue>& kvList_;
    huanrong::semaphore& availableCount_;
    std::function<bool()> isStopped_;
    std::thread thread_;
    
public:
    RedisKeyValueWriter(const std::string& name, 
                        huanrong::ConcurrentList<StringKeyValue>& kvList, 
                        huanrong::semaphore& availableCount,
                        std::function<bool()> isStopped)
        : name_(name), kvList_(kvList), 
          availableCount_(availableCount), 
          isStopped_(isStopped), thread_()
    {
    }

    void start() 
    {
      thread_ = std::thread([this] { run(); });
    }

    void join() 
    {
      thread_.join();
    }

protected:

    void run()
    {
        LOG(INFO) << name_.c_str() << ": Thread started!";
        cpp_redis::redis_client client;
        client.connect();
      
        while (true) {
            if (!availableCount_.wait_for(std::chrono::milliseconds(100))) {
                if (isStopped_()) {
                  break;
                }
                continue;
            } 
  
            StringKeyValue kv;
            bool notEmpty = kvList_.pop_front(kv);
            if (notEmpty) {
                std::string key(kv.key_);
                client.set(kv.key_, kv.value_, [this, key](cpp_redis::reply& reply) {
                    LOG(INFO) << name_.c_str() << ": Setting history for " << key << " got reply " << reply;
                });
                try {
                  client.sync_commit();
                }
                catch (std::exception& ex) {
                  LOG(ERROR) << name_.c_str() << ": EXCEPTION=" << ex.what();
                  LOG(WARNING) << name_.c_str() << ": put back into queue for " << kv.key_;
                  kvList_.push_back(std::move(kv));
                }
            }
        }
      
        client.disconnect();
        LOG(INFO) << name_.c_str() << ": Thread stopped!";
    }

};

#endif
