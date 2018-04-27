#ifndef _HUANRONG_SEMAPHORE_H
#define _HUANRONG_SEMAPHORE_H

#include <condition_variable>
#include <chrono>

namespace huanrong {

class semaphore
{
private:
    int64_t init_;
    int64_t count_;
    std::mutex mutex_;
    std::condition_variable condition_;

public:
    semaphore(int64_t count = 0L) : count_(count), init_(count)
    {}

    int64_t diff() 
    {
        std::lock_guard<std::mutex> lock(mutex_);
        return count_ - init_;
    }

    void notify_one(int64_t count = 1L)
    {
        std::lock_guard<std::mutex> lock(mutex_);
        count_ += count;
        condition_.notify_one();
    }

    void notify_all(int64_t count = 1L)
    {
        std::lock_guard<std::mutex> lock(mutex_);
        count_ += count;
        condition_.notify_all();
    }

    void wait(int64_t count = 1L)
    {
        std::unique_lock<std::mutex> lock(mutex_);
        condition_.wait(lock, [this, count] { return (count_ >= count); });
        count_ -= count;
    }

    template< class Rep, class Period >
    bool wait_for(const std::chrono::duration<Rep, Period>& rel_time, int64_t count = 1L)
    {
        std::unique_lock<std::mutex> lock(mutex_);
        bool ok = condition_.wait_for(lock, rel_time, [this, count] { return (count_ >= count); });
        if (ok) {
            count_ -= count;
        }
        return ok;
    }

    template< class Clock, class Duration >
    bool wait_until(const std::chrono::time_point<Clock, Duration>& timeout_time, int64_t count = 1L)
    {
        std::unique_lock<std::mutex> lock(mutex_);
        bool ok = condition_.wait_until(lock, timeout_time, [this, count] { return (count_ >= count); });
        if (ok) {
            count_ -= count;
        }
        return ok;
    }
};

}

#endif
